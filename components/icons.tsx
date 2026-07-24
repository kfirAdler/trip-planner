import {
  House,
  Route,
  Map,
  ChartColumn,
  Users,
  Pencil,
  X,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  ChevronDown,
  ChevronLeft,
  Sun,
  Moon,
  MapPin,
  type LucideProps,
} from "lucide-react";

// App-wide icon defaults: a slightly heavier, optically-constant stroke reads
// as technical/schematic (closer to wayfinding signage than a generic UI
// icon pack), matching the departure-board identity used throughout.
const defaults: Partial<LucideProps> = { strokeWidth: 1.75, absoluteStrokeWidth: true };

export const IconHome = (props: LucideProps) => <House {...defaults} {...props} />;
export const IconItinerary = (props: LucideProps) => <Route {...defaults} {...props} />;
export const IconMap = (props: LucideProps) => <Map {...defaults} {...props} />;
export const IconStats = (props: LucideProps) => <ChartColumn {...defaults} {...props} />;
export const IconShare = (props: LucideProps) => <Users {...defaults} {...props} />;
export const IconEdit = (props: LucideProps) => <Pencil {...defaults} {...props} />;
export const IconClose = (props: LucideProps) => <X {...defaults} {...props} />;
export const IconMoveUp = (props: LucideProps) => <ArrowUp {...defaults} {...props} />;
export const IconMoveDown = (props: LucideProps) => <ArrowDown {...defaults} {...props} />;
export const IconRemove = (props: LucideProps) => <Trash2 {...defaults} {...props} />;
export const IconAdd = (props: LucideProps) => <Plus {...defaults} {...props} />;
export const IconChevronDown = (props: LucideProps) => <ChevronDown {...defaults} {...props} />;
export const IconSun = (props: LucideProps) => <Sun {...defaults} {...props} />;
export const IconMoon = (props: LucideProps) => <Moon {...defaults} {...props} />;
export const IconPin = (props: LucideProps) => <MapPin {...defaults} {...props} />;
export const IconBack = (props: LucideProps) => <ChevronLeft {...defaults} {...props} />;
