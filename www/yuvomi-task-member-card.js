class YuvomiTaskMemberCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._items = [];
    this._task = null;
    this._busy = false;
    this._error = "";
    this._lastUpdated = null;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Bitte eine Yuvomi-Aufgaben-To-do-Entität als entity angeben.");
    }
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const state = this._config && hass.states[this._config.entity];
    const updated = state?.last_updated;
    if (state && updated !== this._lastUpdated) {
      this._lastUpdated = updated;
      this._loadItems();
    } else {
      this._render();
    }
  }

  getCardSize() {
    return 4;
  }

  async _loadItems() {
    try {
      const result = await this._hass.callWS({
        type: "todo/item/list",
        entity_id: this._config.entity,
      });
      this._items = result.items || [];
    } catch (err) {
      this._error = `Aufgaben konnten nicht geladen werden: ${err.message || err}`;
    }
    this._render();
  }

  _members() {
    const state = this._hass?.states[this._config.entity];
    const members = state?.attributes?.mitglieder || {};
    return Object.entries(members).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }

  async _complete(task, memberId) {
    this._busy = true;
    this._error = "";
    this._render();
    try {
      await this._hass.callService("yuvomi", "complete_task", {
        task_id: Number(task.uid),
        done_by_user_id: Number(memberId),
        status: "done",
      });
      this._task = null;
      this._busy = false;
      this._lastUpdated = null;
      this._render();
      this._loadItems();
    } catch (err) {
      this._busy = false;
      this._error = `Aufgabe konnte nicht abgeschlossen werden: ${err.message || err}`;
      this._render();
    }
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const title = this._config.title || "Yuvomi-Aufgaben";
    const open = this._items.filter((item) => item.status !== "completed");
    const style = `
      :host { display:block; }
      ha-card { padding:16px; }
      h2 { font-size:1.25rem; margin:0 0 12px; }
      ul { list-style:none; margin:0; padding:0; }
      li { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0; border-top:1px solid var(--divider-color); }
      .task { overflow-wrap:anywhere; }
      button { color:var(--primary-text-color); background:var(--secondary-background-color); border:0; border-radius:8px; padding:10px 14px; cursor:pointer; }
      button.primary { color:var(--text-primary-color); background:var(--primary-color); }
      button:disabled { opacity:.6; cursor:default; }
      .muted { color:var(--secondary-text-color); }
      .error { color:var(--error-color); padding-top:8px; }
      .scrim { position:fixed; inset:0; z-index:9999; display:grid; place-items:center; background:rgba(0,0,0,.45); }
      .dialog { box-sizing:border-box; width:min(420px, calc(100vw - 32px)); max-height:80vh; overflow:auto; padding:20px; border-radius:16px; color:var(--primary-text-color); background:var(--card-background-color, var(--ha-card-background, white)); box-shadow:0 8px 24px rgba(0,0,0,.3); }
      .dialog h3 { margin:0 0 8px; }
      .dialog p { margin:0 0 16px; }
      .members { display:grid; gap:8px; }
      .cancel { margin-top:14px; }
    `;
    const list = open.length
      ? `<ul>${open.map((item, index) => `<li><span class="task">${this._escape(item.summary || "(ohne Titel)")}</span><button class="primary" data-task="${index}">Erledigt</button></li>`).join("")}</ul>`
      : `<p class="muted">Keine offenen Aufgaben.</p>`;
    const dialog = this._task
      ? `<div class="scrim" role="presentation"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h3 id="dialog-title">Wer hat die Aufgabe erledigt?</h3><p>${this._escape(this._task.summary || "")}</p><div class="members">${this._members().map(([id, name]) => `<button data-member="${this._escape(id)}" ${this._busy ? "disabled" : ""}>${this._escape(name)}</button>`).join("")}</div>${this._error ? `<p class="error">${this._escape(this._error)}</p>` : ""}<button class="cancel" data-cancel ${this._busy ? "disabled" : ""}>Abbrechen</button></section></div>`
      : "";

    this.shadowRoot.innerHTML = `<style>${style}</style><ha-card><h2>${this._escape(title)}</h2>${list}${this._error && !this._task ? `<p class="error">${this._escape(this._error)}</p>` : ""}</ha-card>${dialog}`;

    this.shadowRoot.querySelectorAll("[data-task]").forEach((button) => {
      button.addEventListener("click", () => {
        this._task = open[Number(button.dataset.task)];
        this._error = "";
        this._render();
      });
    });
    this.shadowRoot.querySelectorAll("[data-member]").forEach((button) => {
      button.addEventListener("click", () => this._complete(this._task, button.dataset.member));
    });
    this.shadowRoot.querySelector("[data-cancel]")?.addEventListener("click", () => {
      if (!this._busy) {
        this._task = null;
        this._error = "";
        this._render();
      }
    });
    this.shadowRoot.querySelector(".scrim")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget && !this._busy) {
        this._task = null;
        this._render();
      }
    });
  }

  _escape(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }
}

customElements.define("yuvomi-task-member-card", YuvomiTaskMemberCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "yuvomi-task-member-card",
  name: "Yuvomi-Aufgaben mit Erledigt-von-Auswahl",
  description: "Schließt eine Aufgabe ab und fragt zuvor das Yuvomi-Familienmitglied ab.",
});
