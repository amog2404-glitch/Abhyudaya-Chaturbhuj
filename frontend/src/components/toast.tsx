import { createContext, useCallback, useContext, useRef, useState, type PropsWithChildren } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, useTheme } from "@/src/theme";

type ToastKind = "info" | "success" | "error";
type ToastCtx = { show: (message: string, kind?: ToastKind) => void };

const Ctx = createContext<ToastCtx | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<string>("");
  const [kind, setKind] = useState<ToastKind>("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, k: ToastKind = "info") => {
      setMsg(message);
      setKind(k);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      }, 2600);
    },
    [opacity],
  );

  const bg =
    kind === "success" ? colors.success : kind === "error" ? colors.error : colors.surfaceInverse;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <Animated.View
        style={[styles.wrap, { opacity, bottom: insets.bottom + 24, pointerEvents: "none" }]}
      >
        {msg ? (
          <View style={[styles.toast, { backgroundColor: bg }]} testID="app-toast">
            <Text style={styles.text}>{msg}</Text>
          </View>
        ) : null}
      </Animated.View>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const useStyles = makeStyles((colors) => ({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  toast: { maxWidth: 480, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  text: { color: colors.onSurfaceInverse, fontSize: 14, fontWeight: "600", textAlign: "center" },
}));
