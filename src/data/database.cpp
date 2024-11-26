#include "../../include/data/database.h"
#include <stdexcept>
#include <sstream>
#include "spdlog/spdlog.h"

namespace DevTrack {

Database::Database(const std::string& dbPath) 
    : m_db(nullptr), m_dbPath(dbPath) {
    openDatabase();
    createTables();
}

Database::~Database() {
    closeDatabase();
}

Database::Database(Database&& other) noexcept 
    : m_db(other.m_db), m_dbPath(std::move(other.m_dbPath)) {
    other.m_db = nullptr;
}

Database& Database::operator=(Database&& other) noexcept {
    if (this != &other) {
        closeDatabase();
        m_db = other.m_db;
        m_dbPath = std::move(other.m_dbPath);
        other.m_db = nullptr;
    }
    return *this;
}

void Database::openDatabase() {
    int rc = sqlite3_open(m_dbPath.c_str(), &m_db);
    if (rc != SQLITE_OK) {
        throw std::runtime_error("Cannot open database: " + std::string(sqlite3_errmsg(m_db)));
    }

    // Enable UTF-8 encoding
    char* errMsg = nullptr;
    rc = sqlite3_exec(m_db, "PRAGMA encoding = 'UTF-8'", nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::string error(errMsg);
        sqlite3_free(errMsg);
        throw std::runtime_error("Failed to set UTF-8 encoding: " + error);
    }
}

void Database::closeDatabase() {
    if (m_db) {
        sqlite3_close(m_db);
        m_db = nullptr;
    }
}

void Database::createTables() {
    const char* createTableSQL = R"(
        CREATE TABLE IF NOT EXISTS projects (
            name TEXT PRIMARY KEY COLLATE NOCASE,
            description TEXT COLLATE NOCASE,
            status INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS tasks (
            project_name TEXT COLLATE NOCASE,
            task_name TEXT COLLATE NOCASE,
            description TEXT COLLATE NOCASE,
            status INTEGER,
            deadline INTEGER,
            progress REAL,
            FOREIGN KEY(project_name) REFERENCES projects(name)
        );
    )";

    char* errMsg = nullptr;
    int rc = sqlite3_exec(m_db, createTableSQL, nullptr, nullptr, &errMsg);
    
    if (rc != SQLITE_OK) {
        std::string error(errMsg);
        sqlite3_free(errMsg);
        throw std::runtime_error("SQL error: " + error);
    }
}

void Database::beginTransaction() {
    char* errMsg = nullptr;
    int rc = sqlite3_exec(m_db, "BEGIN TRANSACTION", nullptr, nullptr, &errMsg);
    
    if (rc != SQLITE_OK) {
        std::string error(errMsg);
        sqlite3_free(errMsg);
        throw std::runtime_error("Failed to begin transaction: " + error);
    }
}

void Database::commitTransaction() {
    char* errMsg = nullptr;
    int rc = sqlite3_exec(m_db, "COMMIT", nullptr, nullptr, &errMsg);
    
    if (rc != SQLITE_OK) {
        std::string error(errMsg);
        sqlite3_free(errMsg);
        throw std::runtime_error("Failed to commit transaction: " + error);
    }
}

void Database::rollbackTransaction() {
    char* errMsg = nullptr;
    int rc = sqlite3_exec(m_db, "ROLLBACK", nullptr, nullptr, &errMsg);
    
    if (rc != SQLITE_OK) {
        std::string error(errMsg);
        sqlite3_free(errMsg);
        throw std::runtime_error("Failed to rollback transaction: " + error);
    }
}

void Database::handleSQLiteError(int rc, const std::string& errorContext) {
    if (rc != SQLITE_OK) {
        throw std::runtime_error(errorContext + ": " + std::string(sqlite3_errmsg(m_db)));
    }
}

void Database::insertProject(const Project& project) {
    sqlite3_stmt* stmt;
    const char* sql = "INSERT INTO projects (name, description, status) VALUES (?, ?, ?)";
    
    beginTransaction();
    int rc = sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr);
    handleSQLiteError(rc, "Failed to prepare project insert statement");

    // Use SQLITE_TRANSIENT to make SQLite copy the strings
    sqlite3_bind_text(stmt, 1, project.getName().c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, project.getDescription().c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 3, static_cast<int>(project.getStatus()));

    rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        rollbackTransaction();
        handleSQLiteError(rc, "Failed to insert project");
    }
    sqlite3_finalize(stmt);

    // Insert tasks
    for (const auto& task : project.getTasks()) {
        const char* taskSql = "INSERT INTO tasks (project_name, task_name, description, status, deadline, progress) VALUES (?, ?, ?, ?, ?, ?)";
        rc = sqlite3_prepare_v2(m_db, taskSql, -1, &stmt, nullptr);
        handleSQLiteError(rc, "Failed to prepare task insert statement");
        
        sqlite3_bind_text(stmt, 1, project.getName().c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, task.name.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 3, task.description.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 4, static_cast<int>(task.status));
        sqlite3_bind_int64(stmt, 5, std::chrono::system_clock::to_time_t(task.deadline));
        sqlite3_bind_double(stmt, 6, task.progress);

        rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE) {
            sqlite3_finalize(stmt);
            rollbackTransaction();
            handleSQLiteError(rc, "Failed to insert task");
        }
        sqlite3_finalize(stmt);
    }
    commitTransaction();
}

void Database::updateProject(const Project& project) {
    // Update project details
    sqlite3_stmt* stmt;
    const char* sql = "UPDATE projects SET description = ?, status = ? WHERE name = ?";
    
    int rc = sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr);
    handleSQLiteError(rc, "Failed to prepare project update statement");

    sqlite3_bind_text(stmt, 1, project.getDescription().c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, static_cast<int>(project.getStatus()));
    sqlite3_bind_text(stmt, 3, project.getName().c_str(), -1, SQLITE_TRANSIENT);

    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    handleSQLiteError(rc, "Failed to update project");

    // Delete existing tasks and reinsert
    const char* deleteTasksSql = "DELETE FROM tasks WHERE project_name = ?";
    rc = sqlite3_prepare_v2(m_db, deleteTasksSql, -1, &stmt, nullptr);
    handleSQLiteError(rc, "Failed to prepare delete tasks statement");

    sqlite3_bind_text(stmt, 1, project.getName().c_str(), -1, SQLITE_TRANSIENT);
    rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    handleSQLiteError(rc, "Failed to delete existing tasks");

    // Reinsert tasks
    for (const auto& task : project.getTasks()) {
        const char* taskSql = "INSERT INTO tasks (project_name, task_name, description, status, deadline, progress) VALUES (?, ?, ?, ?, ?, ?)";
        rc = sqlite3_prepare_v2(m_db, taskSql, -1, &stmt, nullptr);
        handleSQLiteError(rc, "Failed to prepare task insert statement");
        
        sqlite3_bind_text(stmt, 1, project.getName().c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, task.name.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 3, task.description.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 4, static_cast<int>(task.status));
        sqlite3_bind_int64(stmt, 5, std::chrono::system_clock::to_time_t(task.deadline));
        sqlite3_bind_double(stmt, 6, task.progress);

        rc = sqlite3_step(stmt);
        sqlite3_finalize(stmt);

        handleSQLiteError(rc, "Failed to insert task");
    }
}

void Database::deleteProject(const std::string& projectName) {
    // First check if project exists
    if (!projectExists(projectName)) {
        spdlog::error(u8"Cannot delete project '{}': Project does not exist", projectName);
        throw std::runtime_error("Project does not exist");
    }

    spdlog::debug(u8"Starting database transaction for project deletion: {}", projectName);
    beginTransaction();
    
    try {
        sqlite3_stmt* stmt;
        const char* deleteProjSql = "DELETE FROM projects WHERE name = ?";
        const char* deleteTasksSql = "DELETE FROM tasks WHERE project_name = ?";
        
        // Delete project
        spdlog::debug(u8"Preparing to delete project from projects table: {}", projectName);
        int rc = sqlite3_prepare_v2(m_db, deleteProjSql, -1, &stmt, nullptr);
        handleSQLiteError(rc, "Failed to prepare delete project statement");

        rc = sqlite3_bind_text(stmt, 1, projectName.c_str(), -1, SQLITE_TRANSIENT);
        handleSQLiteError(rc, "Failed to bind project name");

        rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE) {
            sqlite3_finalize(stmt);
            spdlog::error(u8"Failed to delete project from database: {}", projectName);
            throw std::runtime_error("Failed to delete project from database");
        }
        sqlite3_finalize(stmt);
        spdlog::debug(u8"Successfully deleted project from projects table: {}", projectName);

        // Delete associated tasks
        spdlog::debug(u8"Preparing to delete associated tasks for project: {}", projectName);
        rc = sqlite3_prepare_v2(m_db, deleteTasksSql, -1, &stmt, nullptr);
        handleSQLiteError(rc, "Failed to prepare delete tasks statement");

        rc = sqlite3_bind_text(stmt, 1, projectName.c_str(), -1, SQLITE_TRANSIENT);
        handleSQLiteError(rc, "Failed to bind project name for tasks deletion");

        rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE) {
            sqlite3_finalize(stmt);
            spdlog::error(u8"Failed to delete project tasks from database: {}", projectName);
            throw std::runtime_error("Failed to delete project tasks from database");
        }
        sqlite3_finalize(stmt);
        spdlog::debug(u8"Successfully deleted associated tasks for project: {}", projectName);

        spdlog::debug(u8"Committing database transaction for project deletion: {}", projectName);
        commitTransaction();
        spdlog::info(u8"Successfully completed project deletion in database: {}", projectName);
    } catch (const std::exception& e) {
        spdlog::error(u8"Error during project deletion, rolling back transaction: {}", e.what());
        rollbackTransaction();
        throw std::runtime_error(std::string("Failed to delete project: ") + e.what());
    }
}

bool Database::projectExists(const std::string& projectName) const {
    sqlite3_stmt* stmt;
    const char* sql = "SELECT COUNT(*) FROM projects WHERE name = ?";
    
    int rc = sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        throw std::runtime_error("Failed to prepare project existence check statement");
    }

    sqlite3_bind_text(stmt, 1, projectName.c_str(), -1, SQLITE_STATIC);

    rc = sqlite3_step(stmt);
    int count = sqlite3_column_int(stmt, 0);
    sqlite3_finalize(stmt);

    return count > 0;
}

std::vector<Project> Database::loadAllProjects() const {
    std::vector<Project> projects;
    sqlite3_stmt* stmt;
    const char* projectSql = "SELECT name, description, status FROM projects";
    
    int rc = sqlite3_prepare_v2(m_db, projectSql, -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        throw std::runtime_error("Failed to prepare project select statement");
    }

    while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
        // Get the length of the text to ensure proper UTF-8 handling
        const unsigned char* nameText = sqlite3_column_text(stmt, 0);
        int nameLen = sqlite3_column_bytes(stmt, 0);
        const unsigned char* descText = sqlite3_column_text(stmt, 1);
        int descLen = sqlite3_column_bytes(stmt, 1);

        std::string name(reinterpret_cast<const char*>(nameText), nameLen);
        std::string description(reinterpret_cast<const char*>(descText), descLen);
        auto status = static_cast<ProjectStatus>(sqlite3_column_int(stmt, 2));

        Project project(name, description);
        project.setProjectStatus(status);

        // Load tasks for this project
        sqlite3_stmt* taskStmt;
        const char* taskSql = "SELECT task_name, description, status, deadline, progress FROM tasks WHERE project_name = ?";
        
        int taskRc = sqlite3_prepare_v2(m_db, taskSql, -1, &taskStmt, nullptr);
        if (taskRc != SQLITE_OK) {
            throw std::runtime_error("Failed to prepare task select statement");
        }

        sqlite3_bind_text(taskStmt, 1, name.c_str(), -1, SQLITE_STATIC);

        while ((taskRc = sqlite3_step(taskStmt)) == SQLITE_ROW) {
            Task task;
            task.name = reinterpret_cast<const char*>(sqlite3_column_text(taskStmt, 0));
            task.description = reinterpret_cast<const char*>(sqlite3_column_text(taskStmt, 1));
            task.status = static_cast<ProjectStatus>(sqlite3_column_int(taskStmt, 2));
            task.deadline = std::chrono::system_clock::from_time_t(sqlite3_column_int64(taskStmt, 3));
            task.progress = sqlite3_column_double(taskStmt, 4);

            project.addTask(task);
        }

        sqlite3_finalize(taskStmt);
        projects.push_back(project);
    }

    sqlite3_finalize(stmt);
    return projects;
}

} // namespace DevTrack
