// declarations.d.ts
// Place this file at KaAgapay/ (same level as tsconfig.json)
// It teaches TypeScript to accept image imports like:
//   import Foo from "../assets/Foo.png"
// Without it you get TS2307 "Cannot find module '*.png'"

declare module "*.png" {
  import { ImageSourcePropType } from "react-native";
  const value: ImageSourcePropType;
  export default value;
}

declare module "*.jpg" {
  import { ImageSourcePropType } from "react-native";
  const value: ImageSourcePropType;
  export default value;
}

declare module "*.jpeg" {
  import { ImageSourcePropType } from "react-native";
  const value: ImageSourcePropType;
  export default value;
}

declare module "*.gif" {
  import { ImageSourcePropType } from "react-native";
  const value: ImageSourcePropType;
  export default value;
}

declare module "*.svg" {
  import { ImageSourcePropType } from "react-native";
  const value: ImageSourcePropType;
  export default value;
}

declare module "*.webp" {
  import { ImageSourcePropType } from "react-native";
  const value: ImageSourcePropType;
  export default value;
}