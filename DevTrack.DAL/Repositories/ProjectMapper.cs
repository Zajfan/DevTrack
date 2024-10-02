using DevTrack.Models;
using MySql.Data.MySqlClient;

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
                // ... map other properties
            };
        }
    }
}