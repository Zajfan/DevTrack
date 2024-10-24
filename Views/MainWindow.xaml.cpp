#include "pch.h"
#include "MainWindow.xaml.h"

using namespace winrt;
using namespace Microsoft::UI::Xaml;

namespace winrt::DevTrack::Views::implementation
{
    MainWindow::MainWindow()
    {
        InitializeComponent();
    }

    void MainWindow::OnAddProjectClick(IInspectable const&, RoutedEventArgs const&)
    {
        // Add project logic here
    }

    void MainWindow::OnEditProjectClick(IInspectable const&, RoutedEventArgs const&)
    {
        // Edit project logic here
    }

    void MainWindow::OnDeleteProjectClick(IInspectable const&, RoutedEventArgs const&)
    {
        // Delete project logic here
    }
}
