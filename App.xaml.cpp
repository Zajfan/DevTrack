#include "pch.h"
#include "App.xaml.h"
#include "MainWindow.xaml.h"

using namespace winrt;
using namespace Microsoft::UI::Xaml;
using namespace Microsoft::UI::Xaml::Controls;
using namespace Microsoft::UI::Xaml::Navigation;
using namespace DevTrack;
using namespace DevTrack::implementation;

App::App()
{
    InitializeComponent();
}

void App::OnLaunched(LaunchActivatedEventArgs const&)
{
    auto window = make<MainWindow>();
    window.Activate();
}
