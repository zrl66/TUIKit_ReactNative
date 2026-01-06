Pod::Spec.new do |s|
  s.name             = 'AtomicXCore'
  s.version          = '999.999.999'
  s.summary          = 'CoreView of LiveRoom.'
  s.homepage         = 'https://trtc.io/'
  s.license          = { :type => 'MIT' }
  s.author           = 'trtc.io' 
  s.source           = { :path => './' }
  s.static_framework = true
  s.platform         = :ios
  s.ios.deployment_target = '15.1'

  s.dependency 'RTCRoomEngine/Professional'
  
  s.vendored_frameworks = [
    'AtomicXCore.xcframework'
  ]
end

