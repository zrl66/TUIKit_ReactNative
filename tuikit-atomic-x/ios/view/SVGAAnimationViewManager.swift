import Foundation
import UIKit
import React

@objc(SVGAAnimationViewManager)
class SVGAAnimationViewManager: RCTViewManager {
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func view() -> UIView! {
        return SVGAAnimationView()
    }
    
    @objc
    func startAnimation(_ node: NSNumber, url: String) {
        DispatchQueue.main.async {
            guard let bridge = self.bridge else {
                print("SVGAAnimationViewManager: bridge is nil")
                return
            }
            guard let view = bridge.uiManager.view(forReactTag: node) as? SVGAAnimationView else {
                print("SVGAAnimationViewManager: startAnimation - view not found for node: \(node)")
                return
            }
            view.startAnimation(url)
        }
    }
    
    @objc
    func stopAnimation(_ node: NSNumber) {
        DispatchQueue.main.async {
            guard let bridge = self.bridge else {
                print("SVGAAnimationViewManager: bridge is nil")
                return
            }
            guard let view = bridge.uiManager.view(forReactTag: node) as? SVGAAnimationView else {
                print("SVGAAnimationViewManager: stopAnimation - view not found for node: \(node)")
                return
            }
            view.stopAnimation()
        }
    }
}
