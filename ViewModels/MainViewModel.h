#pragma once

#include "MainViewModel.g.h"
#include "DelegateCommand.h"
#include "ProjectModel.h"

namespace winrt::DevTrack::ViewModels::implementation
{
    struct MainViewModel : MainViewModelT<MainViewModel>
    {
        MainViewModel();

        winrt::Windows::Foundation::Collections::IObservableVector<winrt::DevTrack::Models::ProjectModel> Projects();
        winrt::Microsoft::UI::Xaml::Input::ICommand AddProjectCommand();
        winrt::Microsoft::UI::Xaml::Input::ICommand EditProjectCommand();
        winrt::Microsoft::UI::Xaml::Input::ICommand DeleteProjectCommand();

    private:
        winrt::Windows::Foundation::Collections::IObservableVector<winrt::DevTrack::Models::ProjectModel> m_projects{ nullptr };
        winrt::Microsoft::UI::Xaml::Input::ICommand m_addProjectCommand{ nullptr };
        winrt::Microsoft::UI::Xaml::Input::ICommand m_editProjectCommand{ nullptr };
        winrt::Microsoft::UI::Xaml::Input::ICommand m_deleteProjectCommand{ nullptr };
    };
}
#include "pch.h"
#include "MainViewModel.h"

using namespace winrt;
using namespace Microsoft::UI::Xaml::Input;
using namespace Windows::Foundation::Collections;

namespace winrt::DevTrack::ViewModels::implementation
{
    MainViewModel::MainViewModel()
    {
        m_projects = single_threaded_observable_vector<winrt::DevTrack::Models::ProjectModel>();

        m_addProjectCommand = make<DelegateCommand>(
            [this](IInspectable const&)
            {
                // Add project logic here
            });

        m_editProjectCommand = make<DelegateCommand>(
            [this](IInspectable const&)
            {
                // Edit project logic here
            });

        m_deleteProjectCommand = make<DelegateCommand>(
            [this](IInspectable const&)
            {
                // Delete project logic here
            });
    }

    IObservableVector<winrt::DevTrack::Models::ProjectModel> MainViewModel::Projects()
    {
        return m_projects;
    }

    ICommand MainViewModel::AddProjectCommand()
    {
        return m_addProjectCommand;
    }

    ICommand MainViewModel::EditProjectCommand()
    {
        return m_editProjectCommand;
    }

    ICommand MainViewModel::DeleteProjectCommand()
    {
        return m_deleteProjectCommand;
    }
}
