package io.trtc.tuikit.atomicxcore.hybridapi.view

import android.content.Context
import android.view.Choreographer
import android.view.View.MeasureSpec
import android.widget.FrameLayout
import com.facebook.react.modules.core.ReactChoreographer

open class ReactFrameLayout(context: Context) : FrameLayout(context) {

    private var layoutEnqueued = false

    private val layoutCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            layoutEnqueued = false
            measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
            )
            layout(left, top, right, bottom)
        }
    }

    override fun requestLayout() {
        super.requestLayout()
        if (!layoutEnqueued && layoutCallback != null) {
            layoutEnqueued = true
            ReactChoreographer.getInstance().postFrameCallback(
                ReactChoreographer.CallbackType.NATIVE_ANIMATED_MODULE,
                layoutCallback
            )
        }
    }
}

