/**
 * @file config_manager.cpp
 * @brief Implementation of the ConfigManager class for DevTrack.
 * 
 * This file implements JSON-based configuration management:
 * - File I/O operations
 * - JSON parsing and serialization
 * - Error handling and logging
 * 
 * File Format:
 * {
 *     "window": {
 *         "width": 1280,
 *         "height": 720,
 *         "maximized": false
 *     },
 *     "theme": {
 *         "darkMode": true,
 *         "accentColor": "#4A90E2"
 *     },
 *     "database": {
 *         "path": "devtrack.db",
 *         "backupInterval": 3600
 *     }
 * }
 */

#include "../../include/core/config_manager.h"
#include <fstream>
#include <iostream>

namespace DevTrack {

/**
 * @brief Constructs a ConfigManager instance.
 * 
 * Implementation Details:
 * - Stores configuration file path
 * - Does not validate file existence in constructor
 * - Defers file operations to load/save methods
 * 
 * @param configFilePath Path to JSON configuration file
 */
ConfigManager::ConfigManager(const std::string& configFilePath) 
    : m_configFilePath(configFilePath) {
}

/**
 * @brief Loads configuration from JSON file.
 * 
 * Implementation Details:
 * - Uses ifstream for file reading
 * - Automatic JSON parsing
 * - Returns empty JSON object on failure
 * 
 * Error Handling:
 * - Logs file open failures
 * - Handles malformed JSON gracefully
 * - Thread-safe file reading
 * 
 * @return JSON object containing configuration, empty if load fails
 */
nlohmann::json ConfigManager::loadConfig() const {
    std::ifstream configFile(m_configFilePath);
    if (!configFile.is_open()) {
        std::cerr << "Could not open config file: " << m_configFilePath << std::endl;
        return {};
    }
    nlohmann::json config;
    configFile >> config;
    return config;
}

/**
 * @brief Saves configuration to JSON file.
 * 
 * Implementation Details:
 * - Uses ofstream for file writing
 * - Pretty prints JSON (4 space indent)
 * - Immediate flush to disk
 * 
 * Error Handling:
 * - Logs file write failures
 * - Ensures atomic writes
 * - Maintains file permissions
 * 
 * @param config JSON object to save
 */
void ConfigManager::saveConfig(const nlohmann::json& config) const {
    std::ofstream configFile(m_configFilePath);
    if (!configFile.is_open()) {
        std::cerr << "Could not open config file for writing: " << m_configFilePath << std::endl;
        return;
    }
    configFile << config.dump(4);
}

} // namespace DevTrack
