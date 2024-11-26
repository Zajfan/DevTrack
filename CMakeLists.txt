cmake_minimum_required(VERSION 3.12)
project(DevTrack VERSION 1.0)

# Set CMake toolchain file for vcpkg
set(CMAKE_TOOLCHAIN_FILE "C:/vcpkg/scripts/buildsystems/vcpkg.cmake")

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add vcpkg library path
list(APPEND CMAKE_PREFIX_PATH "C:/vcpkg/installed/x64-windows")

# Find required packages
find_package(SQLite3 REQUIRED)
find_package(OpenGL REQUIRED)
find_package(glfw3 CONFIG REQUIRED)
find_package(GLEW CONFIG REQUIRED)
find_package(imgui CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(Threads REQUIRED)

# Manually specify ImGui include paths
set(IMGUI_INCLUDE_DIRS 
    "C:/vcpkg/installed/x64-windows/include"
    "C:/vcpkg/installed/x64-windows/include/imgui"
)

# Add include directories
include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/external
    ${CMAKE_SOURCE_DIR}/external/imgui
    ${SQLITE3_INCLUDE_DIRS}
    ${IMGUI_INCLUDE_DIRS}
    "C:/vcpkg/installed/x64-windows/include"
    "C:/vcpkg/installed/x64-windows/include/imgui"
)

# Discover source files dynamically
file(GLOB_RECURSE SOURCES 
    "${CMAKE_SOURCE_DIR}/src/*.cpp"
)

# Remove main.cpp from library sources
list(REMOVE_ITEM SOURCES "${CMAKE_SOURCE_DIR}/src/main.cpp")

# Ensure ImGui backend files are included
set(IMGUI_BACKEND_SOURCES 
    "${CMAKE_SOURCE_DIR}/external/imgui/backends/imgui_impl_glfw.cpp"
    "${CMAKE_SOURCE_DIR}/external/imgui/backends/imgui_impl_opengl3.cpp"
)

# Ensure core ImGui files are included
set(IMGUI_CORE_SOURCES
    "${CMAKE_SOURCE_DIR}/external/imgui/imgui.cpp"
    "${CMAKE_SOURCE_DIR}/external/imgui/imgui_draw.cpp"
    "${CMAKE_SOURCE_DIR}/external/imgui/imgui_demo.cpp"
    "${CMAKE_SOURCE_DIR}/external/imgui/imgui_tables.cpp"
    "${CMAKE_SOURCE_DIR}/external/imgui/imgui_widgets.cpp"
)

# Create DevTrack library
add_library(DevTrackLib STATIC
    ${SOURCES}
    ${IMGUI_BACKEND_SOURCES}
    ${IMGUI_CORE_SOURCES}
)

# Link library dependencies
target_link_libraries(DevTrackLib 
    ${SQLITE3_LIBRARIES}
    OpenGL::GL
    glfw
    GLEW::GLEW
    imgui::imgui
    spdlog::spdlog
    nlohmann_json::nlohmann_json
    Threads::Threads
)

# Create main executable
add_executable(DevTrack 
    "${CMAKE_SOURCE_DIR}/src/main.cpp"
)

# Link main executable to library
target_link_libraries(DevTrack 
    DevTrackLib
    SQLite::SQLite3 
)

# Copy required DLLs to output directory
add_custom_command(TARGET DevTrack POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "C:/vcpkg/installed/x64-windows/bin/glew32.dll"
    $<TARGET_FILE_DIR:DevTrack>
)
add_custom_command(TARGET DevTrack POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "C:/vcpkg/installed/x64-windows/bin/spdlog.dll"
    $<TARGET_FILE_DIR:DevTrack>
)
add_custom_command(TARGET DevTrack POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "C:/vcpkg/installed/x64-windows/bin/fmt.dll"
    $<TARGET_FILE_DIR:DevTrack>
)
add_custom_command(TARGET DevTrack POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "C:/vcpkg/installed/x64-windows/bin/sqlite3.dll"
    $<TARGET_FILE_DIR:DevTrack>
)

# Add subdirectories
add_subdirectory(src)
# Temporarily disable tests while testing delete functionality
#add_subdirectory(tests)

# Optional: Add testing
#enable_testing()
#find_package(GTest CONFIG REQUIRED)

# Add test executable
#add_executable(DevTrackTests 
#    tests/project_tests.cpp
#    tests/project_manager_tests.cpp
#)

# Link test executable
#target_link_libraries(DevTrackTests 
#    GTest::gtest_main
#    DevTrackLib
#    SQLite::SQLite3
#)

# Discover tests
#include(GoogleTest)
#gtest_discover_tests(DevTrackTests)
