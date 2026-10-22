import {
  Baby, BookOpen, Car, Dumbbell, Gamepad2, Gift, GraduationCap, HeartPulse, House, LayoutGrid, PawPrint, Plane,
  Repeat, Shirt, ShoppingBasket, Smartphone, Tag, Ticket, type LucideIcon,
} from "lucide-react";

/** Ícones dos menus por nome curto (o servidor escolhe o nome; o componente do navegador desenha). */
export const MENU_ICONS: Record<string, LucideIcon> = {
  baby: Baby, book: BookOpen, car: Car, dumbbell: Dumbbell, gamepad: Gamepad2, gift: Gift, graduation: GraduationCap,
  heart: HeartPulse, house: House, grid: LayoutGrid, paw: PawPrint, plane: Plane, repeat: Repeat, shirt: Shirt,
  basket: ShoppingBasket, smartphone: Smartphone, tag: Tag, ticket: Ticket,
};
