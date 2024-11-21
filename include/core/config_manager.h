#pragma once

#include <string>
#include <nlohmann/json.hpp>

namespace DevTrack {

class ConfigManager {
public:
    ConfigManager(const std::string& configFilePath);
    nlohmann::json loadConfig() const;
    void saveConfig(const nlohmann::json& config) const;

private:
    std::string m_configFilePath;
};

} // namespace DevTrack
