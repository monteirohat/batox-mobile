import ExpoModulesCore
import Network

// Plain TCP connections for the app's SSH client, over Network.framework. Bytes cross to and from
// JavaScript as base64. NWConnection keeps sends in the order they are made, and every callback
// runs on one serial queue.
public class BatoxTcpModule: Module {
  private let queue = DispatchQueue(label: "br.com.algore.batox.tcp")
  private var connections: [String: NWConnection] = [:]
  private let lock = NSLock()

  // Settles a promise once, whichever of connecting, failing or the timer comes first
  private final class Once {
    var done = false
  }

  public func definition() -> ModuleDefinition {
    Name("BatoxTcp")

    Events("onData", "onClose")

    // Connects and resolves with the connection's id; rejects with ERR_REFUSED, ERR_TIMEOUT,
    // ERR_HOST or ERR_NETWORK
    AsyncFunction("open") { (host: String, port: Int, timeoutMs: Int, promise: Promise) in
      guard let endpointPort = NWEndpoint.Port(rawValue: UInt16(clamping: port)) else {
        promise.reject("ERR_NETWORK", "Invalid port \(port).")
        return
      }
      let tcp = NWProtocolTCP.Options()
      tcp.noDelay = true
      let connection = NWConnection(host: NWEndpoint.Host(host), port: endpointPort, using: NWParameters(tls: nil, tcp: tcp))
      let id = UUID().uuidString
      let once = Once()

      connection.stateUpdateHandler = { [weak self] state in
        guard let self else { return }
        switch state {
        case .ready:
          guard !once.done else { return }
          once.done = true
          self.store(id, connection)
          promise.resolve(id)
          self.receive(id, connection)
        case .waiting(let error):
          // Waiting means "not now": refused fails at once; anything else (no route yet, the
          // local network permission prompt) is retried by the system until the timeout
          if !once.done, Self.code(for: error) == "ERR_REFUSED" {
            once.done = true
            connection.cancel()
            promise.reject("ERR_REFUSED", error.localizedDescription)
          }
        case .failed(let error):
          if !once.done {
            once.done = true
            connection.cancel()
            promise.reject(Self.code(for: error), error.localizedDescription)
          } else {
            self.finish(id, error: error.localizedDescription)
          }
        case .cancelled:
          self.finish(id, error: nil)
        default:
          break
        }
      }
      connection.start(queue: queue)
      queue.asyncAfter(deadline: .now() + .milliseconds(max(timeoutMs, 1))) {
        guard !once.done else { return }
        once.done = true
        connection.cancel()
        promise.reject("ERR_TIMEOUT", "The connection timed out.")
      }
    }

    Function("write") { (id: String, data: String) in
      guard let connection = self.connection(id), let bytes = Data(base64Encoded: data) else { return }
      connection.send(content: bytes, completion: .contentProcessed { [weak self] error in
        if let error {
          self?.finish(id, error: error.localizedDescription)
          connection.cancel()
        }
      })
    }

    Function("close") { (id: String) in
      // Closed from JavaScript: no event, JavaScript already knows
      self.take(id)?.cancel()
    }

    OnDestroy {
      self.lock.lock()
      let all = Array(self.connections.values)
      self.connections.removeAll()
      self.lock.unlock()
      all.forEach { $0.cancel() }
    }
  }

  private func receive(_ id: String, _ connection: NWConnection) {
    connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, isComplete, error in
      guard let self else { return }
      if let data, !data.isEmpty {
        self.sendEvent("onData", ["id": id, "data": data.base64EncodedString()])
      }
      if let error {
        self.finish(id, error: error.localizedDescription)
        connection.cancel()
      } else if isComplete {
        self.finish(id, error: nil)
        connection.cancel()
      } else {
        self.receive(id, connection)
      }
    }
  }

  // The connection ended on its own: tell JavaScript once
  private func finish(_ id: String, error: String?) {
    guard take(id) != nil else { return }
    // A nil error goes to JavaScript as null
    sendEvent("onClose", ["id": id, "error": error])
  }

  private func store(_ id: String, _ connection: NWConnection) {
    lock.lock()
    connections[id] = connection
    lock.unlock()
  }

  private func connection(_ id: String) -> NWConnection? {
    lock.lock()
    defer { lock.unlock() }
    return connections[id]
  }

  private func take(_ id: String) -> NWConnection? {
    lock.lock()
    defer { lock.unlock() }
    return connections.removeValue(forKey: id)
  }

  private static func code(for error: NWError) -> String {
    switch error {
    case .posix(let code):
      switch code {
      case .ECONNREFUSED: return "ERR_REFUSED"
      case .ETIMEDOUT: return "ERR_TIMEOUT"
      default: return "ERR_NETWORK"
      }
    case .dns:
      return "ERR_HOST"
    default:
      return "ERR_NETWORK"
    }
  }
}
