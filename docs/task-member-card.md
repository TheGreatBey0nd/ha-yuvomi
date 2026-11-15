# Yuvomi-Aufgabenkarte: Mitglied beim Erledigen auswählen

Die optionale Lovelace-Karte zeigt offene Einträge einer Yuvomi-To-do-Liste. Nach Tippen auf **Erledigt** öffnet sich ein Dialog mit den Familienmitgliedern. Die gewählte Person wird über `yuvomi.complete_task` als `done_by_user_id` an Yuvomi übertragen.

## Installation

1. Kopiere `www/yuvomi-task-member-card.js` aus diesem Repository nach `/config/www/yuvomi-task-member-card.js` in deiner Home-Assistant-Konfiguration.
2. Füge die Ressource in Home Assistant unter **Einstellungen → Dashboards → Ressourcen** hinzu:
   - URL: `/local/yuvomi-task-member-card.js`
   - Typ: `JavaScript-Modul`
3. Füge die Karte einem Dashboard hinzu und ersetze `todo.yuvomi_tasks` durch die Entity-ID der Yuvomi-Aufgabenliste:

```yaml
type: custom:yuvomi-task-member-card
entity: todo.yuvomi_tasks
title: Familienaufgaben
```

Die Mitgliederliste wird aus dem `mitglieder`-Attribut der Aufgabenliste gelesen. Die Karte lädt die To-do-Einträge über Home Assistants To-do-WebSocket-API. Ein Yuvomi-Token mit Schreibzugriff auf Aufgaben ist erforderlich. Das bisherige Verhalten der normalen To-do-Liste bleibt unverändert.

## Verhalten

- **Erledigt** öffnet zunächst die Mitgliederauswahl; der Aufgabenstatus wird erst nach Auswahl geschrieben.
- Die Karte ruft `yuvomi.complete_task` mit Aufgaben-ID, Mitglieds-ID und `status: done` auf.
- Abbrechen oder ein Klick außerhalb des Dialogs ändert nichts.
- Die native To-do-Liste bleibt verfügbar; diese Karte ist eine alternative Tablet-Oberfläche.
