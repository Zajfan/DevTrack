#include "pch.h"
#include "ProjectService.h"

using namespace winrt;
using namespace Windows::Foundation::Collections;

namespace winrt::DevTrack::Services
{
    IVector<winrt::DevTrack::Models::ProjectModel> ProjectService::GetProjects()
    {
        // Retrieve projects logic here
        return single_threaded_vector<winrt::DevTrack::Models::ProjectModel>();
    }

    void ProjectService::AddProject(winrt::DevTrack::Models::ProjectModel const& project)
    {
        // Add project logic here
    }

    void ProjectService::EditProject(winrt::DevTrack::Models::ProjectModel const& project)
    {
        // Edit project logic here
    }

    void ProjectService::DeleteProject(winrt::DevTrack::Models::ProjectModel const& project)
    {
        // Delete project logic here
    }
}
