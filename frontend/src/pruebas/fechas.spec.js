import { formatearFechaCalendario, hoyLocal } from "../utils/fechas";

describe("utils/fechas", () => {
  describe("formatearFechaCalendario", () => {
    it("muestra el mismo día guardado, sin correrlo por la zona horaria de Chile", () => {
      // Arrange: una fecha de calendario guardada como medianoche UTC
      const fechaGuardada = "2026-10-05T00:00:00.000Z";

      // Act
      const texto = formatearFechaCalendario(fechaGuardada);

      // Assert: antes del arreglo se mostraba 04-10-2026 en Chile
      expect(texto).toBe("05-10-2026");
    });

    it('devuelve "-" cuando no hay fecha', () => {
      expect(formatearFechaCalendario(null)).toBe("-");
      expect(formatearFechaCalendario(undefined)).toBe("-");
      expect(formatearFechaCalendario("")).toBe("-");
    });
  });

  describe("hoyLocal", () => {
    afterEach(() => jasmine.clock().uninstall());

    it("usa la fecha del reloj local, aunque en UTC ya sea el día siguiente", () => {
      // Arrange: 5 de octubre a las 23:30 hora local (en Chile, en UTC ya es 6 de octubre)
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2026, 9, 5, 23, 30));

      // Act
      const hoy = hoyLocal();

      // Assert
      expect(hoy).toBe("2026-10-05");
    });

    it("rellena con cero el mes y el día (formato AAAA-MM-DD)", () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2026, 0, 7, 10, 0));

      expect(hoyLocal()).toBe("2026-01-07");
    });
  });
});
