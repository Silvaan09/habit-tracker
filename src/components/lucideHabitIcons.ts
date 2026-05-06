import type { ComponentType } from 'react';

import Activity from 'lucide-react-native/dist/cjs/icons/activity.js';
import AlarmClock from 'lucide-react-native/dist/cjs/icons/alarm-clock.js';
import Apple from 'lucide-react-native/dist/cjs/icons/apple.js';
import Bed from 'lucide-react-native/dist/cjs/icons/bed.js';
import Bike from 'lucide-react-native/dist/cjs/icons/bike.js';
import BookOpen from 'lucide-react-native/dist/cjs/icons/book-open.js';
import Brain from 'lucide-react-native/dist/cjs/icons/brain.js';
import Calendar from 'lucide-react-native/dist/cjs/icons/calendar.js';
import Check from 'lucide-react-native/dist/cjs/icons/check.js';
import CheckCircle from 'lucide-react-native/dist/cjs/icons/circle-check-big.js';
import Code from 'lucide-react-native/dist/cjs/icons/code.js';
import Coffee from 'lucide-react-native/dist/cjs/icons/coffee.js';
import Cross from 'lucide-react-native/dist/cjs/icons/cross.js';
import Crown from 'lucide-react-native/dist/cjs/icons/crown.js';
import Droplets from 'lucide-react-native/dist/cjs/icons/droplets.js';
import Dumbbell from 'lucide-react-native/dist/cjs/icons/dumbbell.js';
import FlaskConical from 'lucide-react-native/dist/cjs/icons/flask-conical.js';
import Footprints from 'lucide-react-native/dist/cjs/icons/footprints.js';
import GlassWater from 'lucide-react-native/dist/cjs/icons/glass-water.js';
import GraduationCap from 'lucide-react-native/dist/cjs/icons/graduation-cap.js';
import Guitar from 'lucide-react-native/dist/cjs/icons/guitar.js';
import HeartPulse from 'lucide-react-native/dist/cjs/icons/heart-pulse.js';
import House from 'lucide-react-native/dist/cjs/icons/house.js';
import Keyboard from 'lucide-react-native/dist/cjs/icons/keyboard.js';
import Laptop from 'lucide-react-native/dist/cjs/icons/laptop.js';
import Leaf from 'lucide-react-native/dist/cjs/icons/leaf.js';
import Moon from 'lucide-react-native/dist/cjs/icons/moon.js';
import Music from 'lucide-react-native/dist/cjs/icons/music.js';
import Notebook from 'lucide-react-native/dist/cjs/icons/notebook.js';
import Pencil from 'lucide-react-native/dist/cjs/icons/pencil.js';
import Pill from 'lucide-react-native/dist/cjs/icons/pill.js';
import Salad from 'lucide-react-native/dist/cjs/icons/salad.js';
import ShieldPlus from 'lucide-react-native/dist/cjs/icons/shield-plus.js';
import Sparkles from 'lucide-react-native/dist/cjs/icons/sparkles.js';
import Stethoscope from 'lucide-react-native/dist/cjs/icons/stethoscope.js';
import Sun from 'lucide-react-native/dist/cjs/icons/sun.js';
import Tablets from 'lucide-react-native/dist/cjs/icons/tablets.js';
import Timer from 'lucide-react-native/dist/cjs/icons/timer.js';
import X from 'lucide-react-native/dist/cjs/icons/x.js';

export const DEFAULT_LUCIDE_HABIT_ICON = 'BookOpen';

export type LucideIconComponent = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

export type LucideHabitIconKey = keyof typeof LUCIDE_HABIT_ICONS;

export type LucideHabitIconOption = {
  key: LucideHabitIconKey;
  label: string;
  category: 'Health' | 'Learning' | 'Lifestyle';
  keywords: string;
};

export const LucideCheck = Check;
export const LucideCrown = Crown;
export const LucideX = X;

export const LUCIDE_HABIT_ICONS = {
  Activity,
  AlarmClock,
  Apple,
  Bed,
  Bike,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle,
  Code,
  Coffee,
  Cross,
  Droplets,
  Dumbbell,
  FlaskConical,
  Footprints,
  GlassWater,
  GraduationCap,
  Guitar,
  HeartPulse,
  House,
  Keyboard,
  Laptop,
  Leaf,
  Moon,
  Music,
  Notebook,
  Pencil,
  Pill,
  Salad,
  ShieldPlus,
  Sparkles,
  Stethoscope,
  Sun,
  Tablets,
  Timer,
} satisfies Record<string, LucideIconComponent>;

export const LUCIDE_HABIT_ICON_OPTIONS: LucideHabitIconOption[] = [
  { key: 'Pill', label: 'Pill', category: 'Health', keywords: 'pill medicine supplement vitamin' },
  {
    key: 'Tablets',
    label: 'Tablets',
    category: 'Health',
    keywords: 'tablets medicine supplement pills vitamin',
  },
  {
    key: 'HeartPulse',
    label: 'Heart pulse',
    category: 'Health',
    keywords: 'heart health cardio pulse care',
  },
  {
    key: 'Stethoscope',
    label: 'Stethoscope',
    category: 'Health',
    keywords: 'doctor health checkup medical',
  },
  { key: 'Cross', label: 'Care', category: 'Health', keywords: 'care medical health cross' },
  {
    key: 'Dumbbell',
    label: 'Dumbbell',
    category: 'Health',
    keywords: 'workout gym lift strength exercise',
  },
  { key: 'Apple', label: 'Apple', category: 'Health', keywords: 'apple nutrition food fruit' },
  { key: 'Salad', label: 'Salad', category: 'Health', keywords: 'salad nutrition food meal' },
  {
    key: 'GlassWater',
    label: 'Water glass',
    category: 'Health',
    keywords: 'water glass drink hydrate',
  },
  { key: 'Droplets', label: 'Droplets', category: 'Health', keywords: 'water hydrate drops' },
  { key: 'Moon', label: 'Moon', category: 'Health', keywords: 'sleep rest night moon' },
  { key: 'Sun', label: 'Sun', category: 'Health', keywords: 'sun morning light outside' },
  { key: 'Activity', label: 'Activity', category: 'Health', keywords: 'activity movement health' },
  {
    key: 'ShieldPlus',
    label: 'Shield plus',
    category: 'Health',
    keywords: 'shield health protect immunity',
  },
  {
    key: 'FlaskConical',
    label: 'Flask',
    category: 'Health',
    keywords: 'flask science supplement lab',
  },
  { key: 'Leaf', label: 'Leaf', category: 'Health', keywords: 'leaf plant nature calm' },
  {
    key: 'BookOpen',
    label: 'Book',
    category: 'Learning',
    keywords: 'book read study learn pages',
  },
  { key: 'Code', label: 'Code', category: 'Learning', keywords: 'code program developer' },
  { key: 'Pencil', label: 'Pencil', category: 'Learning', keywords: 'write journal notes' },
  {
    key: 'GraduationCap',
    label: 'Study',
    category: 'Learning',
    keywords: 'study school learn education',
  },
  { key: 'Brain', label: 'Brain', category: 'Learning', keywords: 'brain focus memory think' },
  {
    key: 'Notebook',
    label: 'Notebook',
    category: 'Learning',
    keywords: 'notebook notes journal plan',
  },
  { key: 'Laptop', label: 'Laptop', category: 'Learning', keywords: 'laptop computer work' },
  {
    key: 'Keyboard',
    label: 'Keyboard',
    category: 'Learning',
    keywords: 'keyboard typing code write',
  },
  { key: 'Music', label: 'Music', category: 'Lifestyle', keywords: 'music practice song' },
  { key: 'Guitar', label: 'Guitar', category: 'Lifestyle', keywords: 'guitar instrument music' },
  { key: 'Coffee', label: 'Coffee', category: 'Lifestyle', keywords: 'coffee morning drink' },
  { key: 'Bed', label: 'Bed', category: 'Lifestyle', keywords: 'bed sleep rest' },
  { key: 'House', label: 'Home', category: 'Lifestyle', keywords: 'home house routine' },
  { key: 'Bike', label: 'Bike', category: 'Lifestyle', keywords: 'bike cycling cardio' },
  {
    key: 'Footprints',
    label: 'Footprints',
    category: 'Lifestyle',
    keywords: 'walk steps run footprints',
  },
  { key: 'Timer', label: 'Timer', category: 'Lifestyle', keywords: 'timer focus time' },
  {
    key: 'AlarmClock',
    label: 'Alarm',
    category: 'Lifestyle',
    keywords: 'alarm clock reminder time',
  },
  { key: 'Calendar', label: 'Calendar', category: 'Lifestyle', keywords: 'calendar schedule' },
  { key: 'CheckCircle', label: 'Check', category: 'Lifestyle', keywords: 'check done complete' },
  { key: 'Sparkles', label: 'Sparkles', category: 'Lifestyle', keywords: 'sparkle clean magic' },
];

export function getLucideHabitIcon(iconValue: string | null | undefined) {
  if (iconValue && iconValue in LUCIDE_HABIT_ICONS) {
    return LUCIDE_HABIT_ICONS[iconValue as LucideHabitIconKey];
  }

  return LUCIDE_HABIT_ICONS[DEFAULT_LUCIDE_HABIT_ICON];
}
