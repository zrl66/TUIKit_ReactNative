#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>

@interface RCT_EXTERN_MODULE(LiveCoreViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(liveId, NSString)
RCT_EXPORT_VIEW_PROPERTY(coreViewType, NSString)
RCT_EXPORT_VIEW_PROPERTY(round, NSNumber)

RCT_EXTERN_METHOD(setLocalVideoMuteImage:(nonnull NSNumber *)node 
                  bigImageUri:(NSString *)bigImageUri 
                  smallImageUri:(NSString *)smallImageUri)

@end

