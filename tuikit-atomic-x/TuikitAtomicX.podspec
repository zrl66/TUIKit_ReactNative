require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "TuikitAtomicX"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://trtc.io.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/**/*.h"
  
  # Dependencies
  # Use >= 3.0.0 constraint to support source compilation mode (source podspec version may be 3.0.5 or other)
  # For Maven/CocoaPods repository mode, versions are typically >= 3.5.0
  s.dependency "AtomicXCore", "3.6.2"
  s.dependency "RTCRoomEngine/Professional", "3.6.1"
  s.dependency "SVGAPlayer", "~> 2.5"
  s.dependency "TXLiteAVSDK_Professional", "13.0.20278"

  install_modules_dependencies(s)
end
