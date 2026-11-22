package io.github.monteirohat.batox.tcp

import android.util.Base64
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.net.ConnectException
import java.net.InetSocketAddress
import java.net.NoRouteToHostException
import java.net.Socket
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

// Plain TCP connections for the app's SSH client, over java.net.Socket. Bytes cross to and from
// JavaScript as base64. Each connection has a thread that reads and a single thread that writes,
// so writes go out in the order JavaScript made them.
class BatoxTcpModule : Module() {
  private val connections = ConcurrentHashMap<String, Connection>()
  private val connecting: ExecutorService = Executors.newCachedThreadPool()

  private inner class Connection(val id: String, val socket: Socket) {
    private val writer = Executors.newSingleThreadExecutor()
    @Volatile var closedByUs = false

    fun startReading() {
      Thread({
        val buffer = ByteArray(64 * 1024)
        var error: String? = null
        try {
          val input = socket.getInputStream()
          while (true) {
            val n = input.read(buffer)
            if (n < 0) break
            if (n > 0) sendEvent("onData", mapOf("id" to id, "data" to Base64.encodeToString(buffer, 0, n, Base64.NO_WRAP)))
          }
        } catch (e: IOException) {
          if (!closedByUs) error = e.message ?: "The connection was lost."
        }
        finish(error)
      }, "batox-tcp-$id").start()
    }

    fun write(bytes: ByteArray) {
      writer.execute {
        try {
          socket.getOutputStream().apply {
            write(bytes)
            flush()
          }
        } catch (e: IOException) {
          if (!closedByUs) finish(e.message ?: "The connection was lost.")
        }
      }
    }

    fun finish(error: String?) {
      if (connections.remove(id) == null) return
      shutdown()
      if (!closedByUs) sendEvent("onClose", mapOf("id" to id, "error" to error))
    }

    fun shutdown() {
      try {
        socket.close()
      } catch (_: IOException) {
      }
      writer.shutdown()
    }
  }

  override fun definition() = ModuleDefinition {
    Name("BatoxTcp")

    Events("onData", "onClose")

    // Connects and resolves with the connection's id; rejects with ERR_REFUSED, ERR_TIMEOUT,
    // ERR_HOST or ERR_NETWORK
    AsyncFunction("open") { host: String, port: Int, timeoutMs: Int, promise: Promise ->
      connecting.execute {
        val socket = Socket()
        try {
          socket.tcpNoDelay = true
          socket.connect(InetSocketAddress(host, port), timeoutMs)
          val connection = Connection(UUID.randomUUID().toString(), socket)
          connections[connection.id] = connection
          promise.resolve(connection.id)
          connection.startReading()
        } catch (e: Exception) {
          try {
            socket.close()
          } catch (_: IOException) {
          }
          val code = when (e) {
            is ConnectException -> "ERR_REFUSED"
            is SocketTimeoutException -> "ERR_TIMEOUT"
            is UnknownHostException -> "ERR_HOST"
            else -> "ERR_NETWORK"
          }
          promise.reject(CodedException(code, e.message ?: code, e))
        }
      }
    }

    Function("write") { id: String, data: String ->
      connections[id]?.write(Base64.decode(data, Base64.NO_WRAP))
    }

    Function("close") { id: String ->
      connections.remove(id)?.let {
        it.closedByUs = true
        it.shutdown()
      }
    }

    OnDestroy {
      connections.values.forEach {
        it.closedByUs = true
        it.shutdown()
      }
      connections.clear()
      connecting.shutdown()
    }
  }
}
