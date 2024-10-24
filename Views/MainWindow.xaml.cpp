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
    }

    void MainWindow::OnEditProjectClick(winrt::Windows::Foundation::IInspectable const& sender, winrt::Microsoft::UI::Xaml::RoutedEventArgs const& e)
    {
        // Add your code to handle the "Edit Project" button click here
    }

    void MainWindow::OnDeleteProjectClick(winrt::Windows::Foundation::IInspectable const& sender, winrt::Microsoft::UI::Xaml::RoutedEventArgs const& e)
    {
        // Add your code to handle the "Delete Project" button click here
    }
}
