Docker day-to-day commands:

- docker compose up -d: start
- docker compose stop: stop (data stays)
- docker compose down: remove the container (data stays in the volume)
- docker compose down -v: remove the container and the volume, so you start fresh
- docker compose exec db psql -U sovereign -d sovereign: open psql