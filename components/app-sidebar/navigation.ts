import {
  BarChart3,
  Building2,
  Bus,
  ClipboardCheck,
  FileText,
  Home,
  MapPin,
  Megaphone,
  Route,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;

  /**
   * Si es true, el item se marca activo solo cuando la ruta coincide
   * exactamente. Útil para el dashboard raíz.
   */
  exact?: boolean;

  badge?: string | number;

  roles?: readonly string[];

  /**
   * Si es true, el item aparece como acceso directo fijo en la barra de
   * navegación inferior en mobile (máximo 4, el resto va en "Más").
   */
  primary?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];

  /**
   * Si el grupo arranca expandido. Por defecto `true`.
   */
  defaultOpen?: boolean;
};

/**
 * Configuración declarativa del sidebar.
 * Para agregar un item nuevo basta con añadirlo al grupo correspondiente,
 * o crear un nuevo grupo. No es necesario tocar ningún componente.
 */
export const navGroups: NavGroup[] = [
  {
    label: "General",
    items: [
      {
        href: "/dashboard",
        label: "Inicio",
        icon: Home,
        exact: true,
        roles: ["Agencia", "Transporte", "Admin"],
        primary: true,
      },
      {
        href: "/dashboard/graficas",
        label: "Gráficas",
        icon: BarChart3,
        roles: ["Admin"],
      },
    ],
  },

  {
    label: "Agencia",
    items: [
      {
        href: "/dashboard/my-agency",
        label: "Mi agencia",
        icon: Building2,
        roles: ["Agencia"],
        primary: true,
      },
      {
        href: "/dashboard/publications",
        label: "Publicaciones",
        icon: FileText,
        roles: ["Agencia"],
        primary: true,
      },
      {
        href: "/dashboard/promotions",
        label: "Promociones",
        icon: Megaphone,
        roles: ["Agencia"],
        primary: true,
      },
      {
        href: "/dashboard/reviews",
        label: "Pendientes",
        icon: ClipboardCheck,
        roles: ["Agencia"],
      },
    ],
  },

  {
    label: "Transporte",
    items: [
      {
        href: "/dashboard/publications",
        label: "Rutas",
        icon: Route,
        roles: ["Transporte"],
        primary: true,
      },
      {
        href: "/dashboard/agencies",
        label: "Vehículos",
        icon: Bus,
        roles: ["Transporte"],
        primary: true,
      },
      {
        href: "/dashboard/promotions",
        label: "Promociones",
        icon: Megaphone,
        roles: ["Transporte"],
      },
    ],
  },

  {
    label: "Administración",
    items: [
      {
        href: "/dashboard/users",
        label: "Usuarios",
        icon: Users,
        roles: ["Admin"],
        primary: true,
      },
      {
        href: "/dashboard/agencies",
        label: "Agencias",
        icon: Building2,
        roles: ["Admin"],
        primary: true,
      },
      {
        href: "/dashboard/destinations",
        label: "Destinos",
        icon: MapPin,
        roles: ["Admin"],
      },
    ],
  },

  {
    label: "Contenido",
    items: [
      {
        href: "/dashboard/publications",
        label: "Publicaciones",
        icon: FileText,
        roles: ["Admin"],
        primary: true,
      },
      {
        href: "/dashboard/promotions",
        label: "Promociones",
        icon: Megaphone,
        roles: ["Admin"],
      },
      {
        href: "/dashboard/reviews",
        label: "Pendientes",
        icon: ClipboardCheck,
        roles: ["Admin"],
      },
    ],
  },

  {
    label: "Cuenta",
    items: [
      {
        href: "/dashboard/profile",
        label: "Mi perfil",
        icon: UserRound,
        roles: ["Agencia", "Transporte", "Admin"],
        primary: true,
      },
    ],
  },
];