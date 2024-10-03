using DevTrack.BLL;
using System.Windows;

namespace DevTrack
{
    public partial class MainWindow : Window
    {
        private ProjectService projectService;

        public MainWindow(ProjectService projectService)
        {
            InitializeComponent();
            this.projectService = projectService;
            DataContext = this;
        }

        private async void Window_Loaded(object sender, RoutedEventArgs e)
        {
            projectsDataGrid.ItemsSource = await projectService.GetAllProjectsAsync();
            // ... load data for other DataGrids (Tasks, etc.)
        }
    }
}