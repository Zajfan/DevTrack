using MySql.Data.MySqlClient;
using System;

namespace DevTrack.DAL
{
    public class Project
    {
        public int ProjectID { get; set; }
        public string ProjectName { get; set; }
        public string ProjectStage { get; set; }
        public int ProjectManager { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EstimatedCompletionDate { get; set; }
        public decimal? Budget { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public int? Priority { get; set; }
        public string RepositoryURL { get; set; }
        public int CategoryID { get; set; }

        public Project() { }

        public Project(MySqlDataReader reader)
        {
            ProjectID = reader.GetInt32("ProjectID");
            ProjectName = reader.GetString("ProjectName");
            ProjectStage = reader.GetString("ProjectStage");
            ProjectManager = reader.GetInt32("ProjectManager");
            StartDate = reader.IsDBNull(reader.GetOrdinal("StartDate")) ? (DateTime?)null : reader.GetDateTime("StartDate");
            EstimatedCompletionDate = reader.IsDBNull(reader.GetOrdinal("EstimatedCompletionDate")) ? (DateTime?)null : reader.GetDateTime("EstimatedCompletionDate");
            Budget = reader.IsDBNull(reader.GetOrdinal("Budget")) ? (decimal?)null : reader.GetDecimal("Budget");
            Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString("Description");
            Status = reader.GetString("Status");
            Priority = reader.IsDBNull(reader.GetOrdinal("Priority")) ? (int?)null : reader.GetInt32("Priority");
            RepositoryURL = reader.IsDBNull(reader.GetOrdinal("RepositoryURL")) ? null : reader.GetString("RepositoryURL");
            CategoryID = reader.GetInt32("CategoryID");
        }
    }
}