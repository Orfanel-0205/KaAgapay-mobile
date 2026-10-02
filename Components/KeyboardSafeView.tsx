// Components/KeyboardSafeView.tsx
//
// Keeps the field you are typing in above the keyboard, on Android as well.
//
// WHY THE OLD WAY STOPPED WORKING
//
// Most forms here used React Native's KeyboardAvoidingView with
// `behavior={Platform.OS === "ios" ? "padding" : undefined}`. On Android that
// renders a plain View and does nothing, on the understanding that
// `softwareKeyboardLayoutMode: "resize"` in app.json would shrink the window
// instead. It did, until Expo SDK 54 made edge-to-edge permanent on Android.
// An edge-to-edge window is drawn behind the system bars and the keyboard and
// is expected to handle those insets itself, so the system no longer resizes
// it -- and the keyboard simply covered the Chief Complaint box.
//
// Turning KeyboardAvoidingView's Android behaviour on is not quite enough
// either. It compares the keyboard's top edge, which arrives in window
// coordinates, against its own frame from onLayout, which is relative to its
// parent. The two only agree when the parent starts at the top of the window,
// so any header or safe-area wrapper above it makes the result short by that
// much and leaves the bottom of the form under the keyboard.
//
// WHAT THIS DOES INSTEAD
//
// It measures its own position in the window when the keyboard appears and
// pads its bottom by exactly the part the keyboard covers. Both numbers are
// in the same coordinate space, so the answer does not depend on what sits
// above it. Android's ScrollView then does the rest: when its height shrinks
// it scrolls the focused field back into view, which is the platform's own
// behaviour and the same thing that happened when the window used to resize.
//
// On Android the keyboard's top edge comes from getWindowVisibleDisplayFrame
// (ReactRootView.checkForKeyboardEvents), which is accurate with edge-to-edge
// on. On iOS it is the final frame from keyboardWillShow.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Keyboard, Platform, View } from "react-native";
import type { KeyboardEvent, StyleProp, ViewStyle } from "react-native";

export default function KeyboardSafeView({
  children,
  style,
  extraOffset = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Additional space above the keyboard, for screens where the focused field
   * should not sit flush against it.
   */
  extraOffset?: number;
}) {
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);

  /**
   * Where this view's bottom edge is in the window, then what to do with it.
   *
   * Measured when the keyboard appears rather than cached from the last
   * layout: a screen can scroll, a banner can appear above it, and a stale
   * position would pad by the wrong amount. The view's own padding does not
   * change its frame, so measuring while padded is still correct.
   */
  const measureBottom = useCallback((then: (bottom: number) => void) => {
    const node = ref.current;

    if (!node) return;

    node.measureInWindow((_x, y, _width, height) => {
      then(y + height);
    });
  }, []);

  useEffect(() => {
    // iOS announces the keyboard before it moves, Android only after.
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (event: KeyboardEvent) => {
      const keyboardTop = event.endCoordinates.screenY;

      measureBottom((bottom) => {
        setInset(Math.max(0, bottom - keyboardTop + extraOffset));
      });
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, () => setInset(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [measureBottom, extraOffset]);

  return (
    <View ref={ref} style={[{ flex: 1 }, style, { paddingBottom: inset }]}>
      {children}
    </View>
  );
}
