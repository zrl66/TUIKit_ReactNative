Pod::Spec.new do |spec|
  
  spec.name         = 'RTCRoomEngine'
  spec.version      = "999.999.999"
  spec.platform     = :ios, "15.1"
  spec.homepage     = "https://github.com/tencentyun/TUIRoom"
  spec.authors      = 'tencent video cloud'
  spec.license      = { :type => 'Proprietary',
    :text => <<-LICENSE
    copyright 2024 tencent Ltd. All rights reserved.
    LICENSE
  }
  spec.summary      = "RTCRoomEngine"

  spec.requires_arc = true
  spec.static_framework = true
  spec.swift_version = '5.0'
  spec.xcconfig      = { 
    'CLANG_CXX_LANGUAGE_STANDARD' => 'gnu++14',
    'CLANG_CXX_LIBRARY' => 'libc++'
  }
  
  spec.source = { :path => './' }
  
  spec.dependency 'TXLiteAVSDK_Professional', '>= 11.7.15304'
  spec.dependency 'TXIMSDK_Plus_iOS_XCFramework'
  
  spec.default_subspec = 'Professional'
  spec.subspec 'Professional' do |professional|
    professional.pod_target_xcconfig = {
      'USER_HEADER_SEARCH_PATHS' => [
        '${PODS_TARGET_SRCROOT}/api/*',
        '${PODS_TARGET_SRCROOT}/sdk/v2_live_c_include',
        '${PODS_TARGET_SRCROOT}',
        '${PODS_TARGET_SRCROOT}/build',
        '${PODS_ROOT}/TXLiteAVSDK_Professional/TXLiteAVSDK_Professional/TXLiteAVSDK_Professional.xcframework/ios-arm64_armv7/TXLiteAVSDK_Professional.framework/Headers',
        '${PODS_ROOT}/TXIMSDK_Plus_iOS_XCFramework/ImSDK_Plus.xcframework/CHeaders/include'
      ],
      'GCC_PREPROCESSOR_DEFINITIONS' => '_DEBUG',
      'CLANG_ENABLE_OBJC_WEAK' => 'YES',
      'IPHONEOS_DEPLOYMENT_TARGET' => '15.1',
    }
    professional.vendored_frameworks = [
      'RTCRoomEngine.xcframework'
    ]
  end
end

