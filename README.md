# CEN3031_Group_Project
Experiential learning service development

## Local Setup
### prerequisites
- node.js
- PostgreSQL

### install dependencies
```
npm install
```
### Create .env file in the project root with your host port
in `.env`:
```
PORT=your_host_port
```
## Database Setup

### Create Database
in psql:
```
CREATE DATABASE techprep;
```

### Configure environment variables in .env
replace [args] with your own configuration
```
DB_HOST=[localhost]
DB_PORT=[5432]
DB_USER=[postgres]
DB_NAME=techprep
DB_PASSWORD=[password]
```

### Initialize tables and load data
```
psql -U postgres -d techprep -f db/schema.sql
psql -U postgres -d techprep -f db/seed.sql
```