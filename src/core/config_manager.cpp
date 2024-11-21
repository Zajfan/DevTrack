#include "../../include/core/config_manager.h"
#include <fstream>
#include <iostream>

namespace DevTrack {

ConfigManager::ConfigManager(const std::string& configFilePath) 
    : m_configFilePath(configFilePath) {
}

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

void ConfigManager::saveConfig(const nlohmann::json& config) const {
    std::ofstream configFile(m_configFilePath);
    if (!configFile.is_open()) {
        std::cerr << "Could not open config file for writing: " << m_configFilePath << std::endl;
        return;
    }
    configFile << config.dump(4);
}

} // namespace DevTrack
