Pod::Spec.new do |s|
  s.name           = 'BatoxTcp'
  s.version        = '1.0.0'
  s.summary        = 'Plain TCP sockets for the BatoX SSH client'
  s.description    = 'Opens TCP connections over Network.framework and passes their bytes to JavaScript.'
  s.author         = 'monteirohat'
  s.homepage       = 'https://github.com/monteirohat/batox-mobile'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: 'https://github.com/monteirohat/batox-mobile.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
