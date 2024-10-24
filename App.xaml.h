#pragma once

#include "App.xaml.g.h"

namespace winrt::DevTrack::implementation
{
    struct App : AppT<App>
    {
        App();

        void OnLaunched(Microsoft::UI::Xaml::LaunchActivatedEventArgs const&);
    };
}

namespace winrt::DevTrack::factory_implementation
{
    struct App : AppT<App, implementation::App>
    {
    };
}
