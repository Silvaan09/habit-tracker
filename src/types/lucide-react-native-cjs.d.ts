declare module 'lucide-react-native/dist/cjs/icons/*.js' {
  import type { ComponentType } from 'react';

  const Icon: ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;

  export default Icon;
}
