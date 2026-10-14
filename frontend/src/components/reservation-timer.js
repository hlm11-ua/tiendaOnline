/**
 * Componente: Temporizador regresivo de reserva de stock (10 minutos)
 * Muestra el tiempo restante para completar el pago y avisa cuando el tiempo
 * está a punto de agotarse o cuando ha expirado.
 */
export class ReservationTimer {
  constructor({ containerId, onExpired, onTick }) {
    this.container = document.getElementById(containerId);
    this.onExpired = onExpired;
    this.onTick = onTick;
    this.timerInterval = null;
    this.expiresAt = null;
  }

  /**
   * Inicia la cuenta regresiva hasta la fecha expiresAt
   * @param {Date|string|number} expiresAt 
   */
  start(expiresAt) {
    this.stop();
    this.expiresAt = new Date(expiresAt).getTime();
    this.update();

    this.timerInterval = setInterval(() => {
      this.update();
    }, 1000);
  }

  /**
   * Detiene el temporizador
   */
  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Simula la expiración inmediata para facilitar las pruebas manuales (Escenario 4)
   */
  simulateExpiration() {
    this.expiresAt = Date.now() - 1000;
    this.update();
  }

  /**
   * Actualiza el contador y el aspecto visual
   */
  update() {
    if (!this.container || !this.expiresAt) return;

    const now = Date.now();
    const remainingMs = Math.max(0, this.expiresAt - now);
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    const isUrgent = totalSeconds > 0 && totalSeconds < 120; // Menos de 2 minutos
    const isExpired = totalSeconds === 0;

    if (this.onTick) {
      this.onTick({ minutes, seconds, totalSeconds, isExpired });
    }

    let statusClass = 'timer-normal';
    let icon = '⏱️';
    let text = `Artículos reservados durante ${formattedMinutes}:${formattedSeconds}`;

    if (isUrgent) {
      statusClass = 'timer-urgent';
      icon = '⚠️';
      text = `¡Tiempo limitado! Reserva expira en ${formattedMinutes}:${formattedSeconds}`;
    } else if (isExpired) {
      statusClass = 'timer-expired';
      icon = '❌';
      text = 'Reserva de stock expirada';
      this.stop();
      if (this.onExpired) {
        this.onExpired();
      }
    }

    this.container.innerHTML = `
      <div class="reservation-badge ${statusClass}" id="timer-badge" role="status" aria-live="polite">
        <span class="timer-icon" aria-hidden="true">${icon}</span>
        <span class="timer-text" id="timer-display">${text}</span>
        ${
          !isExpired
            ? `<button type="button" class="btn-timer-simular" id="btn-simular-expiracion" title="Prueba rápida: saltar los 10 minutos para validar el Escenario 4">
                Simular fin de tiempo
              </button>`
            : ''
        }
      </div>
    `;

    const simBtn = this.container.querySelector('#btn-simular-expiracion');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        this.simulateExpiration();
      });
    }
  }
}
