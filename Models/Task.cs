using MySql.Data.MySqlClient;
using System;

namespace DevTrack.Models // Changed namespace to DevTrack.Models
{
    public class Task
    {
        public int TaskID { get; set; }
        public int ProjectID { get; set; }
        public string TaskName { get; set; }
        public string Description { get; set; }
        public int AssignedTo { get; set; }
        public DateTime? DueDate { get; set; }
        public string Status { get; set; }
        public int? Priority { get; set; }
        public int? EstimatedTime { get; set; }
        public int? ActualTime { get; set; }

        public Task() { }

        public Task(MySqlDataReader reader)
        {
            TaskID = reader.GetInt32("TaskID");
            ProjectID = reader.GetInt32("ProjectID");
            TaskName = reader.GetString("TaskName");
            Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString("Description");
            AssignedTo = reader.GetInt32("AssignedTo");
            DueDate = reader.IsDBNull(reader.GetOrdinal("DueDate")) ? (DateTime?)null : reader.GetDateTime("DueDate");
            Status = reader.GetString("Status");
            Priority = reader.IsDBNull(reader.GetOrdinal("Priority")) ? (int?)null : reader.GetInt32("Priority");
            EstimatedTime = reader.IsDBNull(reader.GetOrdinal("EstimatedTime")) ? (int?)null : reader.GetInt32("EstimatedTime");
            ActualTime = reader.IsDBNull(reader.GetOrdinal("ActualTime")) ? (int?)null : reader.GetInt32("ActualTime");
        }
    }
}