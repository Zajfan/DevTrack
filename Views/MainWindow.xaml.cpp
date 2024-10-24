#include "pch.h"
#include "MainWindow.xaml.h"
#include <winrt/Windows.Foundation.Collections.h>

using namespace winrt;
using namespace Microsoft::UI::Xaml;

namespace winrt::DevTrack::Views::implementation
{
    MainWindow::MainWindow()
    {
        InitializeComponent();
    }

    void MainWindow::OnAddProjectClick(winrt::Windows::Foundation::IInspectable const& sender, winrt::Microsoft::UI::Xaml::RoutedEventArgs const& e)
    {
        // Add your code to handle the "Add Project" button click here
        auto projects = winrt::single_threaded_observable_vector<winrt::hstring>();
        projects.Append(L"New Project");
        auto projectListView = this->FindName(L"ProjectListView").as<winrt::Microsoft::UI::Xaml::Controls::ListView>();
        projectListView.ItemsSource(projects);
    }

    void MainWindow::OnEditProjectClick(winrt::Windows::Foundation::IInspectable const& sender, winrt::Microsoft::UI::Xaml::RoutedEventArgs const& e)
    {
        // Add your code to handle the "Edit Project" button click here
        auto projectListView = this->FindName(L"ProjectListView").as<winrt::Microsoft::UI::Xaml::Controls::ListView>();
        auto selectedItem = projectListView.SelectedItem().as<winrt::hstring>();

        if (selectedItem)
        {
            // Example: Edit the selected project (for simplicity, just change its name)
            auto projects = projectListView.ItemsSource().as<winrt::Windows::Foundation::Collections::IVector<winrt::hstring>>();
            auto index = projects.IndexOf(selectedItem);
            projects.SetAt(index, L"Edited Project");
        }
    }

    void MainWindow::OnDeleteProjectClick(winrt::Windows::Foundation::IInspectable const& sender, winrt::Microsoft::UI::Xaml::RoutedEventArgs const& e)
    {
        // Add your code to handle the "Delete Project" button click here
        auto projectListView = this->FindName(L"ProjectListView").as<winrt::Microsoft::UI::Xaml::Controls::ListView>();
        auto selectedItem = projectListView.SelectedItem().as<winrt::hstring>();

        if (selectedItem)
        {
            // Example: Delete the selected project
            auto projects = projectListView.ItemsSource().as<winrt::Windows::Foundation::Collections::IVector<winrt::hstring>>();
            auto index = projects.IndexOf(selectedItem);
            projects.RemoveAt(index);
        }
    }
}