// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Partial<Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>>;
type IconSymbolName = SymbolViewProps['name'];

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'person.circle': 'account-circle',
  'lock': 'lock',
  'eye': 'visibility',
  'eye.slash': 'visibility-off',
  'rectangle.portrait.and.arrow.right': 'logout',
  'checkmark.circle.fill': 'check-circle',
  'bell': 'notifications',
  'calendar': 'calendar-today',
  'chevron.left': 'chevron-left',
  'key': 'key',
  'envelope': 'email',
  'info.circle': 'info',
  'clock': 'schedule',
  'phone': 'phone',
  'list.bullet': 'list',
  'slider.horizontal.3': 'tune',
  'location': 'location-on',
  'xmark.circle.fill': 'cancel',
  'exclamationmark.triangle.fill': 'warning',
  'square.and.arrow.down': 'download',
  'record.circle': 'radio-button-checked',
  'stop.circle': 'stop-circle',
  'square.and.arrow.up': 'upload',
  'mappin.and.ellipse': 'place',
  'gift.fill': 'card-giftcard',
  'doc.text': 'description',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name] ?? 'help-outline'} style={style} />;
}
