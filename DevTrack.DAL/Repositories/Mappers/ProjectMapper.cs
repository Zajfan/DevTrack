// ProjectMapper.cs
using DevTrack.DAL.Models;

namespace DevTrack.DAL.Repositories
{
    public class ProjectMapper
    {
        public Project MapFromReader(MySqlDataReader reader)
        {
            return new Project
            {
                ProjectID = reader.GetInt32("ProjectID"),
                ProjectName = reader.GetString("ProjectName"),
                ProjectStage = reader.GetString("ProjectStage"),
                ProjectManager = reader.GetInt32("ProjectManager"),
                StartDate = reader.IsDBNull(reader.GetOrdinal("StartDate")) ? (DateTime?)null : reader.GetDateTime("StartDate"),
                EstimatedCompletionDate = reader.IsDBNull(reader.GetOrdinal("EstimatedCompletionDate")) ? (DateTime?)null : reader.GetDateTime("EstimatedCompletionDate"),
                Budget = reader.IsDBNull(reader.GetOrdinal("Budget")) ? (decimal?)null : reader.GetDecimal("Budget"),
                Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString("Description"),
                Status = reader.GetString("Status"),
                Priority = reader.IsDBNull(reader.GetOrdinal("Priority")) ? (int?)null : reader.GetInt32("Priority"),
                RepositoryURL = reader.IsDBNull(reader.GetOrdinal("RepositoryURL")) ? null : reader.GetString("RepositoryURL"),
                CategoryID = reader.GetInt32("CategoryID")
            };
        }
    }
}