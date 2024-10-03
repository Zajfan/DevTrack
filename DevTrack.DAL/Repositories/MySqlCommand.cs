// ProjectRepository.cs

namespace DevTrack.DAL.Repositories
{
    internal class MySqlCommand
    {
        public MySqlCommand(string query, MySqlConnection connection)
        {
        }

        public object Parameters { get; internal set; }

        internal async Task<MySqlDataReader> ExecuteReaderAsync()
        {
            throw new NotImplementedException();
        }
    }
}