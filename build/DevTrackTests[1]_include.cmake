if(EXISTS "C:/Users/info/Documents/Windsurf/DevTrack/build/DevTrackTests[1]_tests.cmake")
  include("C:/Users/info/Documents/Windsurf/DevTrack/build/DevTrackTests[1]_tests.cmake")
else()
  add_test(DevTrackTests_NOT_BUILT DevTrackTests_NOT_BUILT)
endif()