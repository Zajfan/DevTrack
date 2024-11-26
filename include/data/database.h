#pragma once

#include <string>
#include <vector>
#include <memory>
#include <sqlite3.h>

#include "../core/project.h"

namespace DevTrack {
    /**
     * @brief Core database management class for DevTrack.
     * 
     * This class provides a SQLite-based persistence layer for the application.
     * It handles all direct database operations including project and task management,
     * schema creation, and transaction control.
     * 
     * Thread Safety:
     * - Currently designed for single-threaded access
     * - If multi-threading is needed, consider adding mutex protection
     * 
     * Performance Considerations:
     * - Uses SQLite's prepared statements for optimal query performance
     * - Provides transaction support for batch operations
     * - Consider implementing connection pooling if concurrent access is needed
     */
    class Database {
    public:
        /**
         * @brief Constructs a new Database instance.
         * @param dbPath Path to the SQLite database file. Creates the file if it doesn't exist.
         * 
         * During construction, this will:
         * 1. Open/create the database file
         * 2. Create necessary tables if they don't exist
         * 3. Initialize prepared statements
         */
        explicit Database(const std::string& dbPath = "devtrack.db");

        /**
         * @brief Destructor ensures proper cleanup of database resources.
         * 
         * Handles:
         * 1. Finalizing prepared statements
         * 2. Closing active transactions
         * 3. Closing database connection
         */
        ~Database();

        // Move semantics for RAII compliance
        Database(const Database&) = delete;
        Database& operator=(const Database&) = delete;
        Database(Database&&) noexcept;
        Database& operator=(Database&&) noexcept;

        /**
         * @brief Inserts a new project into the database.
         * @param project The project to insert.
         * @throws std::runtime_error if insertion fails or project already exists.
         * 
         * This operation is atomic - either the entire project (including tasks)
         * is inserted, or nothing is inserted.
         */
        void insertProject(const Project& project);

        /**
         * @brief Updates an existing project's details.
         * @param project The project with updated information.
         * @throws std::runtime_error if project doesn't exist or update fails.
         * 
         * Updates both project metadata and associated tasks.
         */
        void updateProject(const Project& project);

        /**
         * @brief Deletes a project and all its associated data.
         * @param projectName Name of the project to delete.
         * @throws std::runtime_error if project doesn't exist or deletion fails.
         * 
         * This is a cascading delete - removes all associated tasks and data.
         */
        void deleteProject(const std::string& projectName);

        /**
         * @brief Retrieves all projects from the database.
         * @return Vector of Project objects, including their tasks.
         * 
         * This is a potentially expensive operation as it loads all project
         * and task data. Consider implementing pagination for large datasets.
         */
        std::vector<Project> loadAllProjects() const;

        /**
         * @brief Checks if a project exists in the database.
         * @param projectName Name of the project to check.
         * @return true if project exists, false otherwise.
         */
        bool projectExists(const std::string& projectName) const;

        /**
         * @brief Transaction Management Methods
         * 
         * These methods provide ACID compliance for batch operations.
         * Use them when multiple database operations need to be atomic.
         */
        void beginTransaction();
        void commitTransaction();
        void rollbackTransaction();

    private:
        /**
         * @brief Opens or creates the database connection.
         * @throws std::runtime_error if connection fails.
         */
        void openDatabase();

        /**
         * @brief Safely closes the database connection.
         * Finalizes all prepared statements and closes active transactions.
         */
        void closeDatabase();

        /**
         * @brief Creates database schema if it doesn't exist.
         * Includes tables for projects, tasks, and any other necessary structures.
         */
        void createTables();

        /**
         * @brief Handles SQLite error codes and throws appropriate exceptions.
         * @param rc SQLite result code
         * @param errorContext Description of the operation that failed
         */
        void handleSQLiteError(int rc, const std::string& errorContext);

        sqlite3* m_db;           ///< SQLite database connection handle
        std::string m_dbPath;    ///< Path to the database file
    };
}
