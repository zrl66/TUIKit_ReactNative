package io.trtc.tuikit.atomicxcore.hybridapi.view

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter

class ReactSVGAAnimationView(context: Context) : ReactFrameLayout(context), SVGAAnimationListener {
    private val svgaAnimationView: SVGAAnimationView
    private val reactContext: ThemedReactContext = context as ThemedReactContext

    init {
        svgaAnimationView = SVGAAnimationView(context)
        svgaAnimationView.setAnimationListener(this)

        val lp: LayoutParams =
            LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        addView(svgaAnimationView, lp)
    }

    fun startAnimation(playUrl: String) {
        svgaAnimationView.startAnimation(playUrl)
    }

    fun stopAnimation() {
        svgaAnimationView.stopAnimation()
    }

    override fun onFinished() {
        Log.d(TAG, "ReactSVGAAnimationView onFinished")
        sendOnFinishedEvent()
    }

    private fun sendOnFinishedEvent() {
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, "topOnFinished", Arguments.createMap())
    }

    companion object {
        private const val TAG = "ReactSVGAAnimationView"
    }
}

