package io.trtc.tuikit.atomicxcore.hybridapi.view

import android.util.Log
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager

private const val TAG = "SVGAAnimationViewManager"

class SVGAAnimationViewManager : ViewGroupManager<ReactSVGAAnimationView>() {

    override fun getName(): String {
        return "SVGAAnimationView"
    }

    override fun createViewInstance(reactContext: ThemedReactContext): ReactSVGAAnimationView {
        return ReactSVGAAnimationView(reactContext)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        return MapBuilder.builder<String, Any>()
            .put(
                "topOnFinished",
                MapBuilder.of("registrationName", "onFinished")
            )
            .build()
    }

    override fun getCommandsMap(): Map<String, Int> {
        return mapOf(
            "startAnimation" to COMMAND_START_ANIMATION,
            "stopAnimation" to COMMAND_STOP_ANIMATION
        )
    }

    override fun receiveCommand(
        view: ReactSVGAAnimationView,
        commandId: Int,
        args: ReadableArray?
    ) {
        when (commandId) {
            COMMAND_START_ANIMATION -> {
                val url = args?.getString(0)
                Log.i(TAG, "startAnimation: $url")
                url?.let { view.startAnimation(it) }
            }
            COMMAND_STOP_ANIMATION -> {
                Log.i(TAG, "stopAnimation")
                view.stopAnimation()
            }
        }
    }

    companion object {
        private const val COMMAND_START_ANIMATION = 1
        private const val COMMAND_STOP_ANIMATION = 2
    }
}
