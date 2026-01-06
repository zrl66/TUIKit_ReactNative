#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>

@interface RCT_EXTERN_MODULE(SVGAAnimationViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(onFinished, RCTDirectEventBlock)

RCT_EXTERN_METHOD(startAnimation:(nonnull NSNumber *)node url:(NSString *)url)
RCT_EXTERN_METHOD(stopAnimation:(nonnull NSNumber *)node)

@end
