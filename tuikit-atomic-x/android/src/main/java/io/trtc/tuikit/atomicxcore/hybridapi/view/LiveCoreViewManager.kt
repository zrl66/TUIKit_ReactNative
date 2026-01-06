package io.trtc.tuikit.atomicxcore.hybridapi.view

import android.util.Log
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

private const val TAG = "LiveCoreViewManager"

class LiveCoreViewManager : ViewGroupManager<ReactLiveCoreView>() {

    override fun getName(): String {
        return "LiveCoreView"
    }

    override fun createViewInstance(reactContext: ThemedReactContext): ReactLiveCoreView {
        return ReactLiveCoreView(reactContext)
    }

    @ReactProp(name = "liveId")
    fun setLiveId(view: ReactLiveCoreView, liveId: String?) {
        Log.i(TAG, "setLiveId: view=$view, liveId=$liveId")
        view.setLiveId(liveId)
    }

    @ReactProp(name = "coreViewType")
    fun setCoreViewType(view: ReactLiveCoreView, coreViewType: String?) {
        Log.i(TAG, "setCoreViewType: view=$view, coreViewType=$coreViewType")
        view.setCoreViewType(coreViewType)
    }

    @ReactProp(name = "round", defaultInt = -1)
    fun setRound(view: ReactLiveCoreView, round: Int) {
        Log.i(TAG, "setRound: view=$view, round=$round")
        if (round >= 0) {
            view.setRound(round)
        }
    }

    override fun getCommandsMap(): Map<String, Int> {
        return mapOf(
            "setLocalVideoMuteImage" to COMMAND_SET_LOCAL_VIDEO_MUTE_IMAGE
        )
    }

    override fun receiveCommand(
        root: ReactLiveCoreView,
        commandId: Int,
        args: ReadableArray?
    ) {
        Log.i(TAG, "receiveCommand: view=$root, commandId=$commandId")
        when (commandId) {
            COMMAND_SET_LOCAL_VIDEO_MUTE_IMAGE -> {
                val bigImageUri = if (args != null && args.size() > 0 && !args.isNull(0)) {
                    args.getString(0)
                } else {
                    null
                }
                val smallImageUri = if (args != null && args.size() > 1 && !args.isNull(1)) {
                    args.getString(1)
                } else {
                    null
                }
                Log.i(TAG, "setLocalVideoMuteImage: bigImageUri=$bigImageUri, smallImageUri=$smallImageUri")
                root.setLocalVideoMuteImage(bigImageUri, smallImageUri)
            }
        }
    }

    companion object {
        private const val COMMAND_SET_LOCAL_VIDEO_MUTE_IMAGE = 1
    }
}

