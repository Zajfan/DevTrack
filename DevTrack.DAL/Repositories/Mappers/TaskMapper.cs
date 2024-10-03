// TaskMapper.cs
namespace DevTrack.DAL.Repositories
{
    internal class TaskMapper
    {
        public Task MapFromReader(MySqlDataReader reader)
        {
            return new Task
            {
                TaskID = reader.GetInt32("TaskID"),
                ProjectID = reader.GetInt32("ProjectID"),
                TaskName = reader.GetString("TaskName"),
                Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString("Description"),
                AssignedTo = reader.GetInt32("AssignedTo"),
                DueDate = reader.IsDBNull(reader.GetOrdinal("DueDate")) ? (DateTime?)null : reader.GetDateTime("DueDate"),
                Status = reader.GetString("Status"),
                Priority = reader.IsDBNull(reader.GetOrdinal("Priority")) ? (int?)null : reader.GetInt32("Priority"),
                EstimatedTime = reader.IsDBNull(reader.GetOrdinal("EstimatedTime")) ? (int?)null : reader.GetInt32("EstimatedTime"),
                ActualTime = reader.IsDBNull(reader.GetOrdinal("ActualTime")) ? (int?)null : reader.GetInt32("ActualTime")
            };
        }
    }
}