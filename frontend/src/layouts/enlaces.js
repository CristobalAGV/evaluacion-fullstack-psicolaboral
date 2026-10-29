// Enlaces de navegación de la zona privada. Los usan el Sidebar (escritorio) y el menú
// desplegable del Navbar (móvil), así los dos muestran siempre lo mismo para cada rol.
// roles: si se indica, solo esos roles ven el enlace (igual que en las rutas de App.jsx).
export const ENLACES = [
  { a: "/", texto: "Inicio" },
  { a: "/panel", texto: "Panel" },
  { a: "/solicitudes/nueva", texto: "Nueva solicitud", roles: ["analista", "admin"] },
];

export function enlacesPara(rol) {
  return ENLACES.filter((enlace) => !enlace.roles || enlace.roles.includes(rol));
}
