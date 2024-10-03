using MySql.Data.MySqlClient;

namespace DevTrack.DAL.Repositories // Corrected namespace
{
    public interface IDbConnectionFactory
    {
        MySqlConnection CreateConnection();
    }
}