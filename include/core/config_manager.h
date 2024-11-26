#pragma once

#include <string>
#include <nlohmann/json.hpp>

namespace DevTrack {

/**
 * @brief Manages application configuration using JSON.
 * 
 * The ConfigManager handles loading and saving application settings
 * using JSON format. It provides a centralized way to manage persistent
 * application configuration.
 * 
 * Configuration includes:
 * - UI preferences (window size, position)
 * - User preferences
 * - Application settings
 * - Default values
 * 
 * File Format:
 * - Uses JSON for human-readable configuration
 * - Supports nested configuration structures
 * - Maintains backward compatibility with older configs
 * 
 * Thread Safety:
 * - Not thread-safe by default
 * - Use external synchronization for concurrent access
 * 
 * Error Handling:
 * - Throws exceptions for file I/O errors
 * - Provides fallback values for missing configuration
 */
class ConfigManager {
public:
    /**
     * @brief Constructs a ConfigManager instance.
     * @param configFilePath Path to the JSON configuration file
     * 
     * If the configuration file doesn't exist:
     * - Creates a new file with default settings
     * - Logs a warning about using defaults
     * 
     * @throws std::runtime_error if directory is not writable
     */
    ConfigManager(const std::string& configFilePath);

    /**
     * @brief Loads the current configuration.
     * @return JSON object containing all configuration settings
     * 
     * Handles:
     * - File reading and parsing
     * - Schema validation
     * - Default value injection for missing fields
     * 
     * @throws std::runtime_error for file I/O or parsing errors
     */
    nlohmann::json loadConfig() const;

    /**
     * @brief Saves the current configuration.
     * @param config JSON object containing configuration to save
     * 
     * Features:
     * - Atomic write (uses temporary file)
     * - Backup of previous configuration
     * - Pretty printing for readability
     * 
     * @throws std::runtime_error for file I/O errors
     */
    void saveConfig(const nlohmann::json& config) const;

private:
    std::string m_configFilePath;    ///< Path to the configuration file
};

} // namespace DevTrack
