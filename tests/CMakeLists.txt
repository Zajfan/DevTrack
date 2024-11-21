cmake_minimum_required(VERSION 3.12)

# Add test executable
add_executable(DevTrackTests 
    project_tests.cpp
    project_manager_tests.cpp
)

# Link test executable with Google Test and project libraries
target_link_libraries(DevTrackTests 
    GTest::gtest_main
    DevTrack
)

# Discover tests
include(GoogleTest)
gtest_discover_tests(DevTrackTests)
