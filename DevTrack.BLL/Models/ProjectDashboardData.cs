// ProjectDashboardData.cs
using System.Reflection.Metadata;

namespace DevTrack.BLL
{
    public class ProjectDashboardData
    {
        public Project Project { get; set; }
        public List<Task>? Tasks { get; set; }
        public List<Milestone>? Milestones { get; set; }
        public List<Document>? Documents { get; set; }
        // ... add other properties for the dashboard data as needed
    }
}