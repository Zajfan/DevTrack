#pragma once

#include "ProjectModel.h"

namespace winrt::DevTrack::Services
{
    struct ProjectService
    {
        static winrt::Windows::Foundation::Collections::IVector<winrt::DevTrack::Models::ProjectModel> GetProjects();
        static void AddProject(winrt::DevTrack::Models::ProjectModel const& project);
        static void EditProject(winrt::DevTrack::Models::ProjectModel const& project);
        static void DeleteProject(winrt::DevTrack::Models::ProjectModel const& project);
    };
}
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
