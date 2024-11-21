#pragma once

#include <string>
#include <vector>
#include <memory>
#include <sqlite3.h>

#include "../core/project.h"

namespace DevTrack {
    class Database {
    public:
        // Constructor and Destructor
        explicit Database(const std::string& dbPath = "devtrack.db");
        ~Database();

        // Prevent copying, allow moving
        Database(const Database&) = delete;
        Database& operator=(const Database&) = delete;
        Database(Database&&) noexcept;
        Database& operator=(Database&&) noexcept;

        // Project Operations
        void insertProject(const Project& project);
        void updateProject(const Project& project);
        void deleteProject(const std::string& projectName);
        std::vector<Project> loadAllProjects() const;
        bool projectExists(const std::string& projectName) const;

        // Transaction Management
        void beginTransaction();
        void commitTransaction();
        void rollbackTransaction();

    private:
        // Internal database connection management
        void openDatabase();
        void closeDatabase();
        void createTables();

        // Error handling
        void handleSQLiteError(int rc, const std::string& errorContext);

        // Database connection
        sqlite3* m_db;
        std::string m_dbPath;
    };
}
